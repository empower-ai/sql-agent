import { type TableSchema } from '@/../datasource/types';
import { type FC, useEffect, useRef, useState } from 'react';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp';
import MuiAccordion, { type AccordionProps } from '@mui/material/Accordion';
import MuiAccordionSummary, { type AccordionSummaryProps } from '@mui/material/AccordionSummary';
import { styled } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import Box from '@mui/material/Box';

interface Props {
  open: boolean
  onClose: () => void
}

export const SchemasDialog: FC<Props> = ({ open, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };
  const [schemas, setSchemas] = useState<TableSchema[]>([]);
  const [expanded, setExpanded] = useState<string | false>(false);

  const Accordion = styled((props: AccordionProps) => (
    <MuiAccordion disableGutters elevation={0} square {...props} />
  ))(({ theme }) => ({
    border: `1px solid ${theme.palette.divider}`,
    '&:not(:last-child)': {
      borderBottom: 0
    },
    '&:before': {
      display: 'none'
    }
  }));

  const AccordionSummary = styled((props: AccordionSummaryProps) => (
    <MuiAccordionSummary
      expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: '0.9rem' }} />}
      {...props}
    />
  ))(({ theme }) => ({
    backgroundColor:
      theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, .05)'
        : 'rgba(0, 0, 0, .03)',
    flexDirection: 'row-reverse',
    '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
      transform: 'rotate(90deg)'
    },
    '& .MuiAccordionSummary-content': {
      marginLeft: theme.spacing(1)
    }
  }));

  useEffect(() => {
    const fetchData = async () => {
      const result = await fetch('api/dsensei/schemas', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const fetchedSchemas = await result.json();

      setSchemas(fetchedSchemas);
    };

    // setSchemas()

    if (open) {
      fetchData()
        .catch(console.error);
    }
  }, [open]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        window.addEventListener('mouseup', handleMouseUp);
      }
    };

    const handleMouseUp = (_: MouseEvent) => {
      window.removeEventListener('mouseup', handleMouseUp);
      onClose();
    };

    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClose]);

  // Render nothing if the dialog is not open.
  if (!open) {
    return <></>;
  }

  // Render the dialog.
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="fixed inset-0 z-10 overflow-hidden">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="hidden sm:inline-block sm:h-screen sm:align-middle"
            aria-hidden="true"
          />

          <div
            ref={modalRef}
            className="dark:border-netural-400 inline-block max-h-[400px] transform overflow-y-auto rounded-lg border border-gray-300 bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all dark:bg-[#202123] sm:my-8 sm:max-h-[600px] sm:w-full sm:max-w-lg sm:p-6 sm:align-middle"
            role="dialog"
          >
            <div className="text-lg pb-4 font-bold text-black dark:text-neutral-200">
              Database: ecommerce
            </div>
            <div className="text-lg pb-4 font-bold text-black dark:text-neutral-200">
              {'Tables'}
              <div className='py-1'>
                {/* {schemas.tables.map(schema => <div>{JSON.stringify(schema)}</div>)} */}
                {schemas.map(
                  schema =>
                    <>
                      <Accordion expanded={expanded === schema.name} onChange={handleChange(schema.name)}>
                        <AccordionSummary aria-controls="panel1d-content" id="panel1d-header">
                          <Typography>{schema.name}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography>
                            <Box>
                              <DataGrid
                                rows={schema.fields.map(
                                  field => ({
                                    id: field.name,
                                    name: field.name,
                                    type: field.type.startsWith('ENUM') ? 'STRING' : field.type
                                  })
                                )}
                                columns={[{
                                  field: 'name',
                                  headerName: 'Field Name',
                                  flex: 1,
                                  resizable: true
                                }, {
                                  field: 'type',
                                  headerName: 'Field Type',
                                  flex: 1,
                                  resizable: true
                                }]}
                                hideFooter={true}
                                checkboxSelection={false}
                              />
                            </Box>
                          </Typography>
                        </AccordionDetails>
                      </Accordion>
                    </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
